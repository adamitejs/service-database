
const AVL_TREE_IS_UNBALANCED_TO_THE_LEFT = -2;
const AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_LEFT = -1;
const AVL_TREE_IS_BALANCED = 0;
const AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_RIGHT = 1;
const AVL_TREE_IS_UNBALANCED_TO_THE_RIGHT = 2;

function CreateAVLTree(comparator) {
    return { root: null, size: 0 };
}

function CreateAVLTreeNode(key, value) {
    return { left: null, right: null, height: 0, key: key, value: value };
}

function AVLTreeSelect(key, tree) {
    return AVLTreeSelectInternal(key, tree.root);
}

function AVLTreeSelectInternal(key, root) {
    if (key == root.key)
        return root;
    if (key < root.key) {
        if (!root.left) {
            return null;
        } else {
            return AVLTreeSelectInternal(key, root.left);
        }
    } else {
        if (!root.right) {
            return null;
        }
        return AVLTreeSelectInternal(key, root.right);
    }
}


function AVLTreeSelectLeftmost(root) { while(root.left) { root = root.left; } return root; }
function AVLTreeSelectRightmost(root) { while(root.right) { root = root.right; } return root; }

function AVLTreeTraverse(tree, walker) {
    AVLTreeTraverseInternal(tree.root, walker);
}

function AVLTreeTraverseInternal(root, walker) {
    if (root == null)
        return;
    if (!root.left) {
        walker(root.key, root.value);
        if (root.right) {
            AVLTreeTraverseInternal(root.right, walker);
        }
    } else {
        AVLTreeTraverseInternal(root.left, walker);
        walker(root.key, root.value);
    }
}


function AVLTreePrint(tree) {
    AVLTreePrintInternal("", tree.root);
}

function AVLTreePrintInternal(tabs, root) {
    console.log(tabs + root.key + " -> " + root.value);
    if (root.left) {
        console.log(tabs + "left:");
       AVLTreePrintInternal(tabs + "\t", root.left);
    }
    if (root.right) {
        console.log(tabs + "right:");
       AVLTreePrintInternal(tabs + "\t", root.right);
    }
}


function AVLTreeInsert(key, value, tree) {
    console.log("Insert ", key, " -> ", value, " into tree.");
    tree.size++;
    tree.root = AVLTreeInsertInternal(key, value, tree.root, tree);
}

function AVLTreeInsertInternal(key, value, root, tree) {
    if(root == null)
        return CreateAVLTreeNode(key, value);
    
    if (key < root.key) {
        console.log("Inserting into the left.....");
        root.left = AVLTreeInsertInternal(key, value, root.left, tree);
    } else if (key > root.key) {
        console.log("Inserting into the right......");
        root.right = AVLTreeInsertInternal(key, value, root.right, tree);
    } else {
        console.log("Overwrote existing entry!");
        tree.size--;
        root.value = value;
        return root;
    }
    
    root.height = Math.max(AVLTreeLeftHeight(root), AVLTreeRightHeight(root)) + 1;
    
    const balanceAssessment = AVLTreeAssessBalance(root);

    switch(balanceAssessment) {
        case AVL_TREE_IS_UNBALANCED_TO_THE_LEFT:
            if (key > root.left.key) {
                root.left = AVLTreeRotateLeft(root.left);
            }
            return AVLTreeRotateRight(root);
        case AVL_TREE_IS_UNBALANCED_TO_THE_RIGHT:
            if (key < root.right.key) {
                root.right = AVLTreeRotateRight(root.right);
            }
            return AVLTreeRotateLeft(root);
        default:
            return root;
    }
}

function AVLTreeDelete(key, tree) {
    tree.size--;
    tree.root = AVLTreeDeleteInternal(key, tree.root, tree);
}

function AVLTreeDeleteInternal(key, root, tree) {
    if (root == null) {
        tree.size++;
        return root;
    }

    if (key < root.key) {
        root.left = AVLTreeDeleteInternal(key, root.left, tree);
    } else if (key > root.key) {
        root.right = AVLTreeDeleteInternal(key, root.right, tree);
    } else {
        if (!root.left) {
            if (!root.right)
                return null;
            root = root.right;
        } else {
            if (!root.right) {
                root = root.left;
            } else {
                var successor = AVLTreeSelectLeftmost(root.right);
                root.key = successor.key;
                root.value = successor.value;
                root.right = AVLTreeDeleteInternal(successor.key, root.right);
            }
        }
    }

    if (root == null)
        return null;
    
    root.height = Math.max(AVLTreeLeftHeight(root), AVLTreeRightHeight(root)) + 1;
    const balanceAssessment = AVLTreeAssessBalance(root);

    switch(balanceAssessment) {
        case AVL_TREE_IS_UNBALANCED_TO_THE_LEFT:
            const leftBalanceAssessment = AVLTreeAssessBalance(root.left);
            switch(leftBalanceAssessment) {
                case AVL_TREE_IS_BALANCED:
                case AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_LEFT:
                    return AVLTreeRotateRight(root);
                case AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_RIGHT:
                    root.left = AVLTreeRotateLeft(root.left);
                    return AVLTreeRotateRight(root);
                default:
                    return root;
            }
        case AVL_TREE_IS_UNBALANCED_TO_THE_RIGHT:
            const rightBalanceAssessment = AVLTreeAssessBalance(root.right);
            switch(rightBalanceAssessment) {
                case AVL_TREE_IS_BALANCED:
                case AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_RIGHT:
                    return AVLTreeRotateLeft(root);
                case AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_LEFT:
                    root.right = AVLTreeRotateRight(root.right);
                    return AVLTreeRotateLeft(root);
                default:
                    return root;
            }
        default:
            return root;
    }
}

function AVLTreeAssessBalance(root) {
    switch(AVLTreeLeftHeight(root) - AVLTreeRightHeight(root)) {
        case -2: return AVL_TREE_IS_UNBALANCED_TO_THE_RIGHT;
        case -1: return AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_RIGHT;
        case  0: return AVL_TREE_IS_BALANCED;
        case  1: return AVL_TREE_IS_SLIGHTLY_UNBALANCED_TO_THE_LEFT;
        case  2: return AVL_TREE_IS_UNBALANCED_TO_THE_LEFT;
    }
}

function AVLTreeRotateRight(root) {
    console.log("Rotating right.");
    // (B (A C D) E) --> (A C (B D E))
    var a = root.left;
    root.left = a.right;
    a.right = root;
    root.height = Math.max(AVLTreeLeftHeight(root), AVLTreeRightHeight(root)) + 1;
    a.height = Math.max(AVLTreeLeftHeight(a), root.height) + 1;
    return a;
}

function AVLTreeRotateLeft(root) {
    console.log("Rotating left.");
    // (A C (B D E)) --> (B (A C D) E)
    var b = root.right;
    root.right = b.left;
    b.left = root;
    root.height = Math.max(AVLTreeLeftHeight(root), AVLTreeRightHeight(root)) + 1;
    b.height = Math.max(AVLTreeRightHeight(b), root.height) + 1;
    return b;
}

function AVLTreeLeftHeight(root) { return !root.left ? -1 : root.left.height; }
function AVLTreeRightHeight(root) { return !root.right ? -1 : root.right.height; }


/*
var tree = CreateAVLTree();
AVLTreeInsert(0, "H", tree);
AVLTreeInsert(1, "e", tree);
AVLTreeInsert(2, "l", tree);
AVLTreeInsert(3, "l", tree);
AVLTreeInsert(4, "o", tree);
AVLTreeInsert(5, "w", tree);
AVLTreeInsert(6, "o", tree);
AVLTreeInsert(7, "r", tree);
AVLTreeInsert(8, "l", tree);
AVLTreeInsert(9, "d", tree);
console.log("----");
AVLTreePrint(tree);
console.log("----");
AVLTreeDelete(1, tree);
AVLTreeDelete(3, tree);
AVLTreeDelete(5, tree);
AVLTreeDelete(7, tree);
AVLTreeDelete(9, tree);
AVLTreePrint(tree);
console.log("----");

*/

